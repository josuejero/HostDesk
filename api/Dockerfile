FROM php:8.5-cli@sha256:b070c68324c164aa1a656e25fde6474be4d0d1677fbb83e909e7eb2ed5e28a93

RUN docker-php-ext-install pdo_mysql

WORKDIR /app

EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "api/public/router.php"]
