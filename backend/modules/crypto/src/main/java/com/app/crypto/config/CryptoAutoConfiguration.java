package com.app.crypto.config;

import com.app.crypto.config.properties.CryptoProperties;
import com.app.crypto.util.EncryptionService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@EnableConfigurationProperties(CryptoProperties.class)
@Import(EncryptionService.class)
public class CryptoAutoConfiguration {
}
