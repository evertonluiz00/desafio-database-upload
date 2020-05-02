import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Category from '../models/Category';

interface Request {
  title: string;
}

class CreateCategoryService {
  public async execute({ title }: Request): Promise<Category> {
    const categoriesRepository = getRepository(Category);
    const checkCategoryExists = await categoriesRepository.findOne({
      where: { title },
    });

    if (checkCategoryExists) {
      throw new AppError('Category is already exists');
    }

    const category = categoriesRepository.create({
      title,
    });

    await categoriesRepository.save(category);

    return category;
  }
}

export default CreateCategoryService;
