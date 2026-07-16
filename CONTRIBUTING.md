# 🤝 Contributing to Project Brain

We love your input! We want to make contributing to Project Brain as easy and transparent as possible.

---

## Development Process

1. **Fork** the repo
2. **Clone** your fork
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Make** your changes
5. **Test** thoroughly
6. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
7. **Push** to the branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

---

## 🎯 What to Contribute

### High Priority
- Bug fixes
- Performance improvements
- Documentation improvements
- Translation contributions (new languages)

### Medium Priority
- New panels/features
- AI model integrations
- UI/UX improvements

### Low Priority
- Code style refactoring
- Test coverage improvements

---

## 📋 Pull Request Checklist

Before submitting your PR, please ensure:

- [ ] Code follows the existing style
- [ ] TypeScript compiles without errors
- [ ] Tests pass (`npm test`)
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow conventions

---

## 💻 Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- VS Code 1.125.0+

### Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/project-brain.git
cd project-brain

# Install dependencies
npm install

# Start development
npm run watch

# Debug in VS Code
# Press F5
```

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Specific Test
```bash
npm test -- --testNamePattern="my test"
```

### Coverage
```bash
npm run test:coverage
```

---

## 📝 Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance |

### Examples

```
feat(kanban): add drag and drop support
fix(ai): handle Ollama connection errors
docs(readme): update installation guide
refactor(store): simplify data persistence
```

---

## 🐛 Bug Reports

Please include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - How to trigger the bug
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What happens instead
5. **Environment** - OS, VS Code version, etc.
6. **Logs** - Any relevant error messages

### Template

```markdown
**Bug Description:**
[Description here]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What happens instead]

**Environment:**
- OS: [e.g., macOS 13.0]
- VS Code: [e.g., 1.125.0]
- Node: [e.g., 18.0.0]

**Logs:**
```
[Error messages here]
```
```

---

## 💡 Feature Requests

We welcome feature requests! Please include:

1. **Problem** - What problem does it solve?
2. **Solution** - How should it work?
3. **Alternatives** - Any other solutions considered?
4. **Use Cases** - Who would use this?

---

## 🔍 Code Review Process

1. All submissions require review
2. Reviews are done by maintainers
3. We may request changes
4. Once approved, we merge

### Review Criteria

- ✅ Code works as intended
- ✅ Follows existing patterns
- ✅ Is well-documented
- ✅ Has tests (if applicable)
- ✅ Doesn't break existing functionality

---

## 🌍 Translations

We support multiple languages. To add a new language:

1. Copy `src/i18n/en.json`
2. Translate all strings
3. Add to `src/i18n/translations.ts`
4. Update README

---

## 📜 Code of Conduct

### Our Pledge

We are committed to making participation in this project a harassment-free experience.

### Our Standards

- Be respectful and inclusive
- Use welcoming language
- Accept constructive criticism
- Focus on what is best for the community

### Our Responsibilities

Project maintainers are responsible for clarifying standards and will enforce fair standards.

### Enforcement

Instances of abusive, harassing, or unacceptable behavior may be reported to the maintainers.

---

## 🏷️ Labels

| Label | Description |
|-------|-------------|
| `bug` | Bug reports |
| `enhancement` | Feature requests |
| `documentation` | Documentation improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Looking for contributors |
| `question` | Questions |
| `wontfix` | Will not be addressed |

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Thank You

Thank you for contributing to Project Brain! Every contribution helps make this project better.

---

## 📞 Contact

- **GitHub Issues** - For bug reports and feature requests
- **Discussions** - For questions and community support

---

**Happy coding! 🚀**
