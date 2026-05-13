package com.app.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import java.util.concurrent.CountDownLatch;

@SpringBootApplication(scanBasePackages = { "com.app.core", "com.app.persistence", "com.app.common" })
@EnableMongoRepositories(basePackages = { "com.app.persistence.repository" })
public class CoreApplication {

    public static void main(String[] args) throws InterruptedException {
        SpringApplication.run(CoreApplication.class, args);
        // Keep the application running since it's a non-web application
        new CountDownLatch(1).await();
    }
}
