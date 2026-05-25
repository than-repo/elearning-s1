export const Prisma = {
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: any;

    constructor(message: string, options: any) {
      super(message);
      this.code = options.code;
      this.meta = options.meta;
    }
  },
};
