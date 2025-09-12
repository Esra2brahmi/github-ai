# Contributing to GitHub AI

Thank you for your interest in contributing to GitHub AI! We appreciate your time and effort in helping improve this project.

## 🛠️ Development Setup

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/github-ai.git
   cd github-ai
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your own API keys and configuration.

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

## 🧪 Testing

Before submitting a pull request, please ensure:

1. All tests pass:
   ```bash
   npm test
   ```
2. The code is properly formatted:
   ```bash
   npm run format
   ```
3. There are no linting errors:
   ```bash
   npm run lint
   ```

## 📝 Pull Request Process

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/annoying-bug
   ```
2. Commit your changes with a clear commit message
3. Push to your fork and open a pull request

## 📋 Pull Request Guidelines

- Keep pull requests focused on a single feature or fix
- Update documentation as needed
- Include tests for new features
- Ensure all tests pass
- Follow the existing code style
- Reference any related issues in your PR

## 🐛 Reporting Bugs

If you find a bug, please open an issue with:

1. A clear title and description
2. Steps to reproduce the issue
3. Expected vs actual behavior
4. Screenshots if applicable
5. Your environment (browser, OS, Node.js version, etc.)

## 💡 Feature Requests

We welcome feature requests! Please open an issue with:

1. A clear description of the feature
2. Why this feature would be valuable
3. Any potential implementation ideas

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
