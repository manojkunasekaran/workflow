package com.app.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.app")
@EnableMongoRepositories(basePackages = "com.app.persistence.repository")

public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
