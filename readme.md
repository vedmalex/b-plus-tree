# b-plus-tree

Simple b+ tree library implementation

## матриалы по B+ tree

хорошая обзорная статья по полнотекстовому поиску https://habr.com/ru/post/114997/
http://searchivarius.org/ нечеткий поиск
https://www.guru99.com/introduction-b-plus-tree.html
https://neerc.ifmo.ru/wiki/index.php?title=B%2B-%D0%B4%D0%B5%D1%80%D0%B5%D0%B2%D0%BE#.D0.A0.D0.B0.D0.B7.D0.B1.D0.B8.D0.B5.D0.BD.D0.B8.D0.B5_.D1.83.D0.B7.D0.BB.D0.B0
https://www.guru99.com/b-tree-example.html
https://web.stanford.edu/class/cs346/2015/notes/Blink.pdf
http://itu.dk/~mogel/SIDD2011/lectures/BTreeExample.pdf
https://www.cs.csubak.edu/~msarr/visualizations/Algorithms.html
http://pages.cs.wisc.edu/~dbbook/openAccess/thirdEdition/slides/slides3ed-english/Ch10_Tree_Index.pdf
http://www.veretennikov.org/CLB/Data/6921-16554-1-PB.pdf
http://grusha-store.narod.ru/olderfiles/1/Obzor_metodov_polnotekstovogo_poiska.pdf
https://fastss.csg.uzh.ch/ - алгоритмы быстрого поика по похожим элементам Fast Similarity Search in Large Dictionaries


1. сделать проверку всех мест, а их не много где вносятся изменения в структуру дерева
2. сделать независимым от других библиотек, толко typescript
3. сделаь крупные блоки действий и ими уже моделироваь поведение

странные вещи:
- не работают все тесты
- при размере дерева 1 выстраивается в колбасу по 2 штуки, хотя по идее должна была быть в виде бинарного дерева
- в каких-то ситуациях удаляютя не совсем те элементы... это нужно четко проверить
  - когда попадает на границу элемента, то есть удаляем сам реберный элемент


посмотрет реверс
посмотреть операции
посмореть поиск в интервале
сделать findOne ищет первый и не парится
использовать count для оптимизации

придумать курсор: хранит узел и позицию старта, чтобы продолжить идти дальше... при условии что ничего не обновлялось и не удалялось будет работать