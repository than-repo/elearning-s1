export type VnpayIpnRspCode = '00' | '01' | '02' | '04' | '97' | '99';

export class VnpayIpnResponseDto {
  RspCode!: VnpayIpnRspCode;
  Message!: string;
}
