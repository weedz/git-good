all: check git-good

check:
	pnpm run lint

clean:
	rm -rf dist

nodegit:
	pnpm run build:native

git-good: nodegit
	pnpm run build
