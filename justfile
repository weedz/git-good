all: check build

check:
	pnpm run lint

clean:
	rm -rf dist

nodegit:
	pnpm run build:native

build: nodegit
	pnpm run build
