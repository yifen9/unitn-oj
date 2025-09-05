resource "cloudflare_pages_project" "frontend" {
  account_id = var.account_id
  name       = "${var.project_name}-pages"
  production_branch = "main"
}

resource "cloudflare_d1_database" "db" {
  account_id = var.account_id
  name       = "${var.project_name}-d1"
}

resource "cloudflare_queue" "submissions" {
  account_id      = var.account_id
  queue_name      = var.queue_name
}