import { Select, Tag, message } from "antd";

const filterTags = (values) => {
  return values.filter(tag => (tag.length > 0) && !/[<>]/.test(tag));
}

const tokenize = (input) => {
    // Разбиение на токены произойдёт:
    //  - Если возвращаемый функцией массив не пустой и не равен [input].
    //  - При потере фокуса с Select (то есть когда срабатывает onBlur).
    //  - При нажатии Enter.
    // Нарочно возвращем [''] в случае странного ввода (скорее всего случайно вставили большой кусок текста).
    if (input.length > 300) {
      message.error("Вставка тегов заблокирована (текст более 300 символов)");
      return [''];
    }
    const tokens = input.trim().split(/\s+/);
    if (tokens.length > 10) {
      message.error("Вставка тегов заблокирована (более 10 штук)");
      return [''];
    }
    return tokens;
};

const tagRenderCore = (color, props) => {
  const { label, value, closable, onClose } = props;
  return (
    <Tag
      color={color}
      closable={closable}
      onClose={onClose}
      onMouseDown={(e) => {
        // Необходимо для возможности выделить текст.
        e.stopPropagation();
      }}
      style={{ marginInlineEnd: 4 }}
    >
      {label}
    </Tag>
  );
};

function PhraseTagSelect({ tagColor, value, onChange }) {
  return (
    <Select
      mode="tags"
      style={{ width: '100%' }}
      open={false}
      suffixIcon={null}
      options={null}
      tokenSeparators={tokenize}
      tagRender={props => tagRenderCore(tagColor, props)}
      value={value}
      onChange={values => onChange(filterTags(values))}
    />
  );
}

export default PhraseTagSelect;
