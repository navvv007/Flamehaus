USE flamehaus_db;

CREATE TABLE IF NOT EXISTS order_cancellations (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    order_id             BIGINT        NOT NULL,
    cancelled_by         VARCHAR(20)   NOT NULL DEFAULT 'CUSTOMER',
    cancelled_by_name    VARCHAR(100)  NULL,
    reason               VARCHAR(300)  NULL,
    cancelled_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refund_status        VARCHAR(20)   NOT NULL DEFAULT 'NOT_APPLICABLE',
    refund_id            VARCHAR(100)  NULL,
    refund_amount        DOUBLE        NULL,
    refund_gateway       VARCHAR(20)   NULL,
    refund_initiated_at  DATETIME      NULL,
    refund_completed_at  DATETIME      NULL,
    refund_note          VARCHAR(300)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cancel_order (order_id),
    CONSTRAINT fk_cancel_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

SELECT 'order_cancellations table ready' AS result;
