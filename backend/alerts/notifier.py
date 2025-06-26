import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict
import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

class Notifier:
    def __init__(self):
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        
        # Twilio configuration
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_from_number = os.getenv('TWILIO_FROM_NUMBER')
        
        if self.twilio_account_sid and self.twilio_auth_token:
            self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.twilio_client = None

    async def send_email_alert(self, to_email: str, product_name: str, 
                             current_price: float, threshold: float, url: str) -> bool:
        """Send price alert via email."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            msg['Subject'] = f'Price Alert: {product_name}'

            body = f"""Hello!

Great news! The price of {product_name} has dropped below your alert threshold.

Current Price: ${current_price:.2f}
Your Alert Threshold: ${threshold:.2f}

View the product here: {url}

Best regards,
Smart Price Tracker"""

            msg.attach(MIMEText(body, 'plain'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            return True

        except Exception as e:
            print(f"Error sending email alert: {str(e)}")
            return False

    async def send_sms_alert(self, to_number: str, product_name: str, 
                            current_price: float, threshold: float) -> bool:
        """Send price alert via SMS using Twilio."""
        if not self.twilio_client:
            return False

        try:
            message = f"Price Alert: {product_name} is now ${current_price:.2f} (below your threshold of ${threshold:.2f})"

            self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_from_number,
                to=to_number
            )

            return True

        except Exception as e:
            print(f"Error sending SMS alert: {str(e)}")
            return False

    async def send_alert(self, alert_data: Dict) -> bool:
        """Send alert through all configured channels."""
        success = False

        if 'email' in alert_data:
            email_success = await self.send_email_alert(
                alert_data['email'],
                alert_data['product_name'],
                alert_data['current_price'],
                alert_data['threshold'],
                alert_data['url']
            )
            success = success or email_success

        if 'phone' in alert_data:
            sms_success = await self.send_sms_alert(
                alert_data['phone'],
                alert_data['product_name'],
                alert_data['current_price'],
                alert_data['threshold']
            )
            success = success or sms_success

        return success