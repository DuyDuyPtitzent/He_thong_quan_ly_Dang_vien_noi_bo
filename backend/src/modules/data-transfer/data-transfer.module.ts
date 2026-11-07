import { Module } from '@nestjs/common'
import { DataTransferService } from './data-transfer.service'

@Module({ providers: [DataTransferService], exports: [DataTransferService] })
export class DataTransferModule {}
