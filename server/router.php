<?php
// Router chỉ dành cho php -S khi phát triển, không cần trên Apache hosting.
declare(strict_types=1);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (preg_match('#/(?:\.git|node_modules|supabase|tests|tools|docs)(?:/|$)#', $path) || str_contains($path, '..')) { http_response_code(404); exit; }
if (str_contains($path, '/server/') && !str_ends_with($path, '/server/api.php')) { http_response_code(404); exit; }
return false;
