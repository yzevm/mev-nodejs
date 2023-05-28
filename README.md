### Usage

```sh
npm ci
cp .env.example .env
# open .env and paste private key
npm run build
npm run start # npm run start:dev // for development
```


### Testng
1. Go to https://app.uniswap.org/#/swap
1. Select https://chainlist.org/chain/5 network in metamask
1. Add token to swap tUSDT (https://goerli.etherscan.io/tx/0x8ee6cd86de71815bbfa7a680d3ba9e18d5ea40acce1d3a04b14a1b1e0e468e5d)
1. Change `max base fee` and `priority fee` to `0.001`
1. Sunbit swap transaction
