-include .env

install:
	forge install OpenZeppelin/openzeppelin-contracts@v5.0.1 --no-commit
	forge install smartcontractkit/chainlink@v2.7.0 --no-commit

build:
	forge build

test:
	forge test -vvv

test-gas:
	forge test -vvv --gas-report

deploy-testnet:
	forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

deploy-mainnet:
	forge script script/Deploy.s.sol --rpc-url base --broadcast --verify

snapshot:
	forge snapshot

clean:
	forge clean
