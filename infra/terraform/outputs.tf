output "pages_project_name" {
    value = cloudflare_pages_project.frontend.name
}

output "d1_db_id"          {
    value = cloudflare_d1_database.db.id
}

output "queue_name"        {
    value = cloudflare_queue.submissions.queue_name
}
