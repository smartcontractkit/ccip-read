exports.NULL_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

exports.DUMMY_BATCH_HEADERS = [
  {
    batchIndex: 0,
    batchRoot: exports.NULL_BYTES32,
    batchSize: 0,
    prevTotalElements: 0,
    extraData: exports.NULL_BYTES32,
  },
]

exports.DUMMY_BATCH_PROOFS = [
  {
    index: 0,
    siblings: [exports.NULL_BYTES32],
  },
]
