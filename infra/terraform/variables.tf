variable "cf_api_token" {
  type        = string
  description = "Cloudflare API token with required scopes"
  sensitive   = true
}
variable "account_id" { type = string }
variable "zone_id"    { type = string }

variable "project_name" { type = string }
variable "queue_name"   { type = string }