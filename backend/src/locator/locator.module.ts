import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocatorService } from './locator.service';
import { LocatorController } from './locator.controller';
import { SearchHistory } from './search-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchHistory])],
  providers: [LocatorService],
  controllers: [LocatorController],
})
export class LocatorModule { }
