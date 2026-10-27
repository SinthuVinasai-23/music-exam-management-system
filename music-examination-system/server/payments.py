"""Provider boundary. Implement hosted checkout and authenticated server reconciliation.
No raw card fields may cross this interface. The default is deliberately unavailable.
"""
class PaymentUnavailable(Exception):
    pass

class PaymentService:
    def create_checkout(self, *, allocation_id, amount_cents, currency, teacher_id):
        raise PaymentUnavailable('Card checkout is not configured. Choose another method or retry later.')

    def verify_payment(self, *, allocation_id, provider_reference):
        raise PaymentUnavailable('Provider verification is not configured.')

    def refund(self, *, reference, amount_cents, idempotency_key):
        raise PaymentUnavailable('Provider refund is not configured.')
