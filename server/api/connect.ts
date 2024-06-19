import TTLCache from '@isaacs/ttlcache'

// 客户端待初始化连接池，key是peer的id
const initPool = new TTLCache<string, any>({
  max: 8192,
  ttl: 600e3,
  dispose: (peer) => {
    if (!peer.isInited) {
      // 如果超时未初始化，则断开连接
      peer.ctx.node.ws.close()
    }
  }
})

// 已初始化连接池
// key为：
// 1、发起方：连接ID
// 2、接收方：R + 连接ID
const initedPool = new TTLCache<string, any>({
  max: 20000,
  ttl: 600e3,
  dispose: (peer) => {
    peer.ctx.node.ws.close()
  }
})

function disposePeer(peer: any) {
  initPool.delete(peer.id)
  peer.ctx.node.ws.close()
}

// 初始化发送端
function initSend(peer: any) {
  if (peer.isInited) {
    return
  }
  let code = genDigitCode(4)
  let retryCount = 2048
  while (initedPool.has(code)) {
    if (retryCount-- <= 0) {
      throw new Error('Init code fail')
    }
  }
  initedPool.set(code, peer)
  peer.isInited = true
  initPool.delete(peer.id)
  // 初始化发送端成功，返回连接码
  peer.send(JSON.stringify({ type: 'code', code: code }))
}

// 初始化接收端
function initRecive(peer: any, code: string) {
  if (peer.pairPeer) {
    // throw new Error('Already paired')
    return
  }
  const targetPeer = initedPool.get(code)
  if (!targetPeer || targetPeer.pairPeer) {
    peer.send(JSON.stringify({ type: 'status', code: '404' }))
    disposePeer(peer)
    return
  }
  targetPeer.pairPeer = peer
  peer.pairPeer = targetPeer
  peer.isInited = true
  initedPool.set('R' + code, peer)
  initPool.delete(peer.id)
  // 配对成功
  peer.send(JSON.stringify({ type: 'status', code: '0' }))
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`${new Date().toISOString()} open: #${peer.id}`)
    initPool.set(peer.id, peer)
  },

  close(peer) {
    console.log(`${new Date().toISOString()} close: #${peer.id}`)
    disposePeer(peer)
  },

  message(peer: any, msg) {
    try {
      const data = JSON.parse(msg.text())
      if (data.type === 'send') {
        // 发送端初始化
        initSend(peer)
      } else if (data.type === 'recive') {
        // 接收端初始化
        if (/^\d{4}$/.test(data.code)) {
          initRecive(peer, data.code)
        } else {
          // 如果code不是4位数字，则断开
          disposePeer(peer)
        }
      } else if (peer.pairPeer) {
        peer.pairPeer.send(msg)
      } else {
        disposePeer(peer)
      }
    } catch (e) {
      // console.warn(e)
      disposePeer(peer)
    }
  },

  error(peer, error) {
    console.warn(error)
    disposePeer(peer)
  }
})

function genDigitCode(length: number): string {
  if (length <= 0) {
    throw new Error('长度必须大于0')
  }

  let code = ''

  for (let i = 0; i < length; i++) {
    // 生成一个0到9之间的随机整数
    const digit = Math.floor(Math.random() * 10)
    // 将数字拼接到字符串中
    code += digit
  }

  return code
}