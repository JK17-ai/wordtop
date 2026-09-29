-- Correct only known legacy spellings. Preserve operator edits and all study/answer history.
begin;
update public.learning_catalog as catalog set meaning = patch.meaning
from (values
 ('27','medium','매체','매체 ('),
 ('31','phenomenon','현상','현상 ('),
 ('204','millennium','천년','천년 ('),
 ('1019','stimulus','자극','자극 ('),
 ('1044','larva','유충, 애벌레','유충, 애벌레 ('),
 ('1776','fungus','균류','균류 ('),
 ('1788','offspring','(동물의) 새끼, 자식','(동물의) 새끼, 자식 ('),
 ('1852','synthesis','합성','합성 (')
) as patch(id, word, meaning, old_meaning)
where catalog.id = patch.id and catalog.word = patch.word and catalog.meaning = patch.old_meaning;
commit;
