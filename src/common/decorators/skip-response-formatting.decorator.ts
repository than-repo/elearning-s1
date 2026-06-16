import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_FORMATTING_KEY = 'skipResponseFormatting';

export const SkipResponseFormatting = () =>
  SetMetadata(SKIP_RESPONSE_FORMATTING_KEY, true);
