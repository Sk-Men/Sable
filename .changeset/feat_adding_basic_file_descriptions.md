---
sable: minor
---

# Feat: Adding basic file descriptions

#182 by @nushea

<!-- Please read https://github.com/ajbura/cinny/blob/dev/CONTRIBUTING.md before submitting your pull request -->

### Description
This pr adds basic file description options, if one may choose to caption or provide additional details to an image itself.
Through this PR each item individually on the Upload Board has a chevron next to the delete button which when selected opens a text editor for setting up the caption for the item. If the editor is closed and a file has a description, a plaintext version of it will be displayed under the file.
Currently, descriptions have to be saved prior to sending a message, and selecting the chevron discards any changes as-well.

(collapsed view when no file has a description)
<img width="413" height="334" alt="image" src="https://github.com/user-attachments/assets/bf2c4f05-acb9-4d66-ba6a-c195bb4ec79a" />

(collapsed view when files have descriptions)
<img width="408" height="417" alt="image" src="https://github.com/user-attachments/assets/dda297b5-27ad-4ec8-b9a2-d9d10d586a12" />

(open view when the editors are opened)
<img width="411" height="465" alt="image" src="https://github.com/user-attachments/assets/42c47eaf-0924-4614-81a3-94ae088b38ad" />

#### Type of change

- [x] New feature (non-breaking change which adds functionality)

### Checklist:

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings

