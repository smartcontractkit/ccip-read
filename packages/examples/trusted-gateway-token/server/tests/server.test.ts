import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ethers } from 'ethers';
import supertest from 'supertest';
import { makeApp } from '../src/app';

chai.use(chaiAsPromised);

const TEST_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const SIGNER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('trusted-gateway-token server', () => {
  const abi = [
    'function getSignedBalance(address addr) public view returns(uint256 balance, bytes sig)',
  ];

  describe('end-to-end tests', () => {
    it('answers queries for a known address', async () => {
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [
        TEST_ADDRESS,
      ]);
      await supertest(makeApp(SIGNER_PRIVATE_KEY, '/'))
        .get(`/${TEST_ADDRESS}/${calldata}.json`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .then(response => {
          const responsedata = iface.decodeFunctionResult(
            'getSignedBalance',
            response.body.data
          );
          expect(responsedata.length).to.equal(2);
          expect(responsedata[0].toString()).to.equal('1000000000000000000000');
          expect(responsedata[1].length).to.equal(132);
        });
    });
  });
});
