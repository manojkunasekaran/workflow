package com.app.api.config;

import com.app.api.context.SessionOrganizationContextFilter;
import com.app.api.service.auth.AuthSessionService;
import com.app.api.service.auth.OrganizationMembershipService;
import com.app.api.service.auth.UserAuthService;
import com.app.persistence.repository.OrganizationRepository;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Registers {@link SessionOrganizationContextFilter} as a servlet filter bean.
 *
 * <p>By defining the filter in a {@link Configuration} class instead of as a raw {@code @Component},
 * Spring Boot's {@code @WebMvcTest} controller slice tests will not attempt to autowire the filter's
 * service dependencies into isolated controller test contexts.
 */
@Configuration
public class SessionFilterConfig {

    @Bean
    public FilterRegistrationBean<SessionOrganizationContextFilter> sessionOrganizationContextFilter(
            AuthSessionService authSessionService,
            UserAuthService userAuthService,
            OrganizationMembershipService membershipService,
            OrganizationRepository organizationRepository) {
        SessionOrganizationContextFilter filter = new SessionOrganizationContextFilter(
                authSessionService, userAuthService, membershipService, organizationRepository);
        FilterRegistrationBean<SessionOrganizationContextFilter> registration =
                new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}
