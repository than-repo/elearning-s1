// src/core/mailer/mailer.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('MAIL_HOST');
    const port = Number(this.configService.getOrThrow<string>('MAIL_PORT'));
    const secure =
      this.configService.getOrThrow<string>('MAIL_SECURE') === 'true';

    const user = this.configService.getOrThrow<string>('MAIL_USER');
    const pass = this.configService.getOrThrow<string>('MAIL_PASSWORD');

    const fromName = this.configService.getOrThrow<string>('MAIL_FROM_NAME');
    const fromEmail = this.configService.getOrThrow<string>('MAIL_FROM_EMAIL');

    this.from = `"${fromName}" <${fromEmail}>`;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(input: SendMailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (error) {
      this.logger.error('Failed to send email', error);

      /**
       * Important:
       * In forgot-password flow, usually you should NOT expose this error
       * to the client, because the API response should remain generic.
       */
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your E-learningVN password';

    const text = `
You requested to reset your password.

Open this link to reset your password:
${resetUrl}

This link will expire soon.

If you did not request this, you can ignore this email.
`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your password</h2>

        <p>You requested to reset your password.</p>

        <p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 10px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            Reset password
          </a>
        </p>

        <p>If the button does not work, copy and paste this link into your browser:</p>

        <p>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>

        <p>This link will expire soon.</p>

        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `;

    await this.sendMail({
      to,
      subject,
      text,
      html,
    });
  }
}
