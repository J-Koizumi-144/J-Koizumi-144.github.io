// GitHub Pagesではサーバー側の /api/arxiv を動かせないため、
// Cloudflare Workersなどに置いた arXiv APIプロキシのURLを設定します。
window.ARXIV_API_ENDPOINT = "https://arxiv-author-categories-proxy.jun-juggler.workers.dev/api/arxiv";