import { getRepository } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);
    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactionsCSV: CSVTransaction[] = [];
    const categoriesCSV: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categoriesCSV.push(category);
      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesDB = await categoriesRepository.find();
    const categoriesDBTitle = categoriesDB.map(
      (category: Category) => category.title,
    );

    const categoriesAdd = categoriesCSV
      .filter(category => !categoriesDBTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const createCategories = categoriesRepository.create(
      categoriesAdd.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(createCategories);

    const categoriesAll = [...createCategories, ...categoriesDB];

    const createTransactions = transactionsRepository.create(
      transactionsCSV.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: categoriesAll.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(filePath);

    return createTransactions;
  }
}

export default ImportTransactionsService;
