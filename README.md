[![CI](https://github.com/yifen9/unitn-oj/actions/workflows/ci.yml/badge.svg)](https://github.com/yifen9/unitn-oj/actions/workflows/ci.yml)

## Dev Cheatsheet

```
pnpm -C frontend test

pnpm wrangler d1 migrations apply DB --local

pnpm wrangler d1 execute DB --local --file d1/seed/dev_seed.sql

pnpm wrangler d1 execute DB --local --command "SELECT * FROM courses LIMIT 5"
```