

## Diagnosis

`demo1` has many products. Currently `MenuPage` renders **every product across every category at once** as `ProductCard`s with images. On iOS, hundreds of simultaneous DOM nodes + image decodes blow the renderer memory limit → silent refresh.

Need to check current rendering structure first.
