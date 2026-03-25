import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SearchHistoryDocument = SearchHistory & Document;

@Schema({ timestamps: true })
export class SearchHistory {
    @Prop({ required: true })
    url: string;

    @Prop({ required: true })
    keyword: string;

    @Prop({ required: true })
    locatorType: string;

    @Prop({ type: [{ tag: String, locator: String, snippets: { playwright: String, cypress: String, selenium: String } }], default: [] })
    results: { tag: string; locator: string; snippets?: { playwright: string; cypress: string; selenium: string } }[];

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;
}

export const SearchHistorySchema = SchemaFactory.createForClass(SearchHistory);
