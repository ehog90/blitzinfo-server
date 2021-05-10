import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DaoService } from './services/dao/dao.service';

@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/blitzinfo')],
  providers: [DaoService],
  exports: [DaoService],
})
export class DbModule {}
