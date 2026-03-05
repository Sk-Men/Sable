---
default: patch
---

# Hide delete modal after message deletion

#151 by @7w1

<!-- Please read https://github.com/ajbura/cinny/blob/dev/CONTRIBUTING.md before submitting your pull request -->

### Description

<!-- Please include a summary of the change. Please also include relevant motivation and context. List any dependencies that are required for this change. -->

Hides the delete modal by properly calling onClose() after a successful deletion.

Fixes #150

#### Type of change

- [x] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

### Checklist:

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings
