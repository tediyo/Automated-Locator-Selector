import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('search_history')
export class SearchHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    url: string;

    @Column()
    keyword: string;

    @Column()
    locatorType: string;

    @Column('simple-json')
    results: { tag: string; locator: string }[];

    @ManyToOne(() => User)
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}
