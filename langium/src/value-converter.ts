import { DefaultValueConverter, type CstNode, type GrammarAST, type ValueType } from 'langium';

export class VodslValueConverter extends DefaultValueConverter {
    protected override runConverter(rule: GrammarAST.AbstractRule, input: string, cstNode: CstNode): ValueType {
        if (rule.name !== 'STRING') return super.runConverter(rule, input, cstNode);
        const escapes: Record<string, string> = {
            b: '\b', t: '\t', n: '\n', f: '\f', r: '\r',
            '"': '"', "'": "'", '\\': '\\'
        };
        let result = '';
        for (let index = 1; index < input.length - 1; index++) {
            const char = input[index];
            if (char !== '\\') {
                result += char;
                continue;
            }
            const escaped = input[++index];
            if (escaped === 'u') {
                result += String.fromCharCode(parseInt(input.slice(index + 1, index + 5), 16));
                index += 4;
            } else {
                result += escapes[escaped];
            }
        }
        return result;
    }
}
