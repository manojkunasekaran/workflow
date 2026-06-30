package com.app.messaging.rabbit;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class RabbitMessagingNames {

    public static final String EXCHANGE_WORKFLOW = "workflow.exchange";
    public static final String DLX_EXCHANGE = "workflow.dlx";
}
