exports.toHexString = (buf) => {
  return '0x' + exports.fromHexString(buf).toString('hex')
}

exports.fromHexString = (str) => {
  if (typeof str === 'string' && str.startsWith('0x')) {
    return Buffer.from(str.slice(2), 'hex')
  }

  return Buffer.from(str)
}
  