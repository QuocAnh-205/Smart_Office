// Client MQTT 3.1.1 tối giản chạy trên WebSocket.
// Không cần thư viện ngoài nên chạy được trong Expo Go, Android, iOS và web.
// Hỗ trợ: CONNECT, SUBSCRIBE (QoS 0), PUBLISH (QoS 0), PINGREQ, nhận PUBLISH.

function utf8Encode(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    if (c > 0xffff) {
      c -= 0x10000;
      s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
    } else s += String.fromCharCode(c);
  }
  return s;
}

const str = (s) => {
  const b = utf8Encode(s);
  return [b.length >> 8, b.length & 255, ...b];
};

function packet(type, body) {
  const len = [];
  let x = body.length;
  do {
    let d = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) d |= 128;
    len.push(d);
  } while (x > 0);
  return new Uint8Array([type, ...len, ...body]);
}

export function createMqttClient({ url, clientId, onConnect, onMessage, onClose }) {
  let ws = null;
  let buf = [];
  let ping = null;
  let packetId = 1;
  let closedByUser = false;
  let retry = null;
  let connected = false;

  const send = (bytes) => {
    if (ws && ws.readyState === 1) ws.send(bytes.buffer);
  };

  const handle = (type, data) => {
    const kind = type >> 4;
    if (kind === 2) {
      // CONNACK
      if (data[1] === 0) {
        connected = true;
        clearTimeout(connectTimer);
        onConnect?.();
      } else {
        // Broker từ chối: đóng socket để onclose báo lỗi và tự thử lại
        try { ws?.close(); } catch { /* bỏ qua */ }
      }
    } else if (kind === 3) {
      // PUBLISH
      const tLen = (data[0] << 8) | data[1];
      const topic = utf8Decode(data.slice(2, 2 + tLen));
      const qos = (type >> 1) & 3;
      const start = 2 + tLen + (qos > 0 ? 2 : 0);
      onMessage?.(topic, utf8Decode(data.slice(start)));
    }
  };

  const parse = () => {
    while (buf.length >= 2) {
      let mult = 1;
      let len = 0;
      let i = 1;
      let byte;
      do {
        if (i >= buf.length) return;
        byte = buf[i++];
        len += (byte & 127) * mult;
        mult *= 128;
      } while (byte & 128);
      if (buf.length < i + len) return;
      handle(buf[0], buf.slice(i, i + len));
      buf = buf.slice(i + len);
    }
  };

  let connectTimer = null;

  const open = () => {
    buf = [];
    connected = false;
    ws = new WebSocket(url, ['mqtt']);
    ws.binaryType = 'arraybuffer';
    // Mạng chặn cổng (vd. 8884 trên Wi-Fi trường/ký túc xá) thường "treo" chứ không báo lỗi:
    // quá 10s chưa có CONNACK thì chủ động đóng để onclose báo mất kết nối và thử lại.
    const thisWs = ws;
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => {
      if (!connected && ws === thisWs) {
        try { thisWs.close(); } catch { /* bỏ qua */ }
      }
    }, 10000);
    ws.onopen = () => {
      // CONNECT: giao thức MQTT v3.1.1, clean session, keep-alive 60 giây
      send(packet(0x10, [...str('MQTT'), 4, 0x02, 0, 60, ...str(clientId)]));
      ping = setInterval(() => send(new Uint8Array([0xc0, 0])), 25000);
    };
    ws.onmessage = (e) => {
      buf = buf.concat(Array.from(new Uint8Array(e.data)));
      parse();
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (ws !== thisWs) return; // socket cũ đã bị thay thế
      clearInterval(ping);
      clearTimeout(connectTimer);
      connected = false;
      onClose?.('Mất kết nối broker');
      clearTimeout(retry);
      if (!closedByUser) retry = setTimeout(open, 3000); // tự kết nối lại
    };
  };

  open();

  return {
    get connected() {
      return connected;
    },
    subscribe(topic) {
      const id = packetId++ & 0xffff || 1;
      send(packet(0x82, [id >> 8, id & 255, ...str(topic), 0]));
    },
    publish(topic, message, retain = false) {
      send(packet(retain ? 0x31 : 0x30, [...str(topic), ...utf8Encode(message)]));
    },
    end() {
      closedByUser = true;
      clearTimeout(retry);
      clearTimeout(connectTimer);
      clearInterval(ping);
      try {
        send(new Uint8Array([0xe0, 0])); // DISCONNECT
        ws?.close();
      } catch {
        // bỏ qua
      }
    },
  };
}
