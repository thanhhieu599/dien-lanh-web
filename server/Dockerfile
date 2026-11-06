FROM php:8.5-apache
RUN docker-php-ext-install pdo_mysql
RUN printf 'display_errors=Off\nlog_errors=On\nupload_max_filesize=8M\npost_max_size=9M\nsession.use_strict_mode=1\n' > /usr/local/etc/php/conf.d/app.ini
