/* External Imports */
const rlp = require('rlp');
const seedbytes = require('random-bytes-seed');
const { SecureTrie, BaseTrie } = require('merkle-patricia-tree');

/* Internal Imports */
const { fromHexString, toHexString } = require('./utils');
const { NULL_BYTES32 } = require('./constants');

const rlpEncodeAccount = (account) => {
  return toHexString(
    rlp.encode([
      account.nonce,
      account.balance,
      account.storageRoot || NULL_BYTES32,
      account.codeHash || NULL_BYTES32,
    ])
  )
}

const rlpDecodeAccount = (encoded) => {
  const decoded = rlp.decode(fromHexString(encoded))
  return {
    nonce: decoded[0].length ? parseInt(decoded[0], 16) : 0,
    balance: decoded[1].length ? parseInt(decoded[1], 16) : 0,
    storageRoot: decoded[2].length ? toHexString(decoded[2]) : NULL_BYTES32,
    codeHash: decoded[3].length ? toHexString(decoded[3]) : NULL_BYTES32,
  }
}

const makeTrie = async (nodes, secure) => {
  const TrieClass = secure ? SecureTrie : BaseTrie
  const trie = new TrieClass()

  for (const node of nodes) {
    await trie.put(fromHexString(node.key), fromHexString(node.val))
  }

  return {
    trie,
    TrieClass,
  }
}

exports.TrieTestGenerator = class TrieTestGenerator {
  constructor(
    _TrieClass,
    _trie,
    _nodes,
    _subGenerators
  ) {
      this._TrieClass = _TrieClass;
      this._trie = _trie;
      this._nodes = _nodes;
      this._subGenerators = _subGenerators;
  }

  static async fromNodes(opts) {
    const { trie, TrieClass } = await makeTrie(opts.nodes, opts.secure)

    return new TrieTestGenerator(TrieClass, trie, opts.nodes)
  }

  static async fromRandom(opts) {
    const getRandomBytes = seedbytes(opts.seed)
    const nodes = [...Array(opts.nodeCount)].map(() => {
      return {
        key: toHexString(getRandomBytes(opts.keySize || 32)),
        val: toHexString(getRandomBytes(opts.valSize || 32)),
      }
    })

    return TrieTestGenerator.fromNodes({
      nodes,
      secure: opts.secure,
    })
  }

  static async fromAccounts(opts) {
    const subGenerators = []

    for (const account of opts.accounts) {
      if (account.storage) {
        const subGenerator = await TrieTestGenerator.fromNodes({
          nodes: account.storage,
          secure: opts.secure,
        })

        account.storageRoot = toHexString(subGenerator._trie.root)
        subGenerators.push(subGenerator)
      }
    }

    const nodes = opts.accounts.map((account) => {
      return {
        key: account.address,
        val: rlpEncodeAccount(account),
      }
    })

    const { trie, TrieClass } = await makeTrie(nodes, opts.secure)

    return new TrieTestGenerator(TrieClass, trie, nodes, subGenerators)
  }

  async makeInclusionProofTest(key) {
    if (typeof key === 'number') {
      key = this._nodes[key].key
    }

    const trie = this._trie.copy()

    const proof = await this.prove(key)
    const val = await trie.get(fromHexString(key))

    return {
      proof: toHexString(rlp.encode(proof)),
      key: toHexString(key),
      val: toHexString(val),
      root: toHexString(trie.root),
    }
  }

  async makeAllInclusionProofTests() {
    return Promise.all(
      this._nodes.map(async (node) => {
        return this.makeInclusionProofTest(node.key)
      })
    )
  }

  async makeNodeUpdateTest(key, val) {
    if (typeof key === 'number') {
      key = this._nodes[key].key
    }

    const trie = this._trie.copy()

    const proof = await this.prove(key)
    const oldRoot = trie.root

    await trie.put(fromHexString(key), fromHexString(val))
    const newRoot = trie.root

    return {
      proof: toHexString(rlp.encode(proof)),
      key: toHexString(key),
      val: toHexString(val),
      root: toHexString(oldRoot),
      newRoot: toHexString(newRoot),
    }
  }

  async makeAccountProofTest(address) {
    if (typeof address === 'number') {
      address = this._nodes[address].key
    }

    const trie = this._trie.copy()

    const proof = await this.prove(address)
    const account = await trie.get(fromHexString(address))

    return {
      address,
      account: rlpDecodeAccount(toHexString(account)),
      accountTrieWitness: toHexString(rlp.encode(proof)),
      accountTrieRoot: toHexString(trie.root),
    }
  }

  async makeAccountUpdateTest(address, account) {
    if (typeof address === 'number') {
      address = this._nodes[address].key
    }

    const trie = this._trie.copy()

    const proof = await this.prove(address)
    const oldRoot = trie.root

    await trie.put(
      fromHexString(address),
      fromHexString(rlpEncodeAccount(account))
    )
    const newRoot = trie.root

    return {
      address,
      account,
      accountTrieWitness: toHexString(rlp.encode(proof)),
      accountTrieRoot: toHexString(oldRoot),
      newAccountTrieRoot: toHexString(newRoot),
    }
  }

  async prove(key) {
    return this._TrieClass.prove(this._trie, fromHexString(key))
  }
}