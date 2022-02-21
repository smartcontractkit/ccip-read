// import { ethersMain } from './ethers';
import { web3Main } from './web3';

const main = async () => {
  // await ethersMain();
  await web3Main();
};

main()
  .then((x) => {
    console.log('finished: ', x);
  })
  .catch((e) => {
    console.log('error: ', e);
  });
