FROM php:8.3-cli@sha256:92ff31bbd049fd199bf3700719374e4594b2baa7324eefc459bda26d622c3ea9

RUN docker-php-ext-install pdo_mysql

WORKDIR /app

EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "api/public/router.php"]
