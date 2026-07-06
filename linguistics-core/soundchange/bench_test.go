package soundchange

import "testing"

// BenchmarkApplyRuleWithClasses measures ApplyRule on an engine with several
// registered classes and a rule whose environment references one of them.
// This is the hot path where the sorted-class-name list was previously
// recomputed twice per ApplyRule call.
func BenchmarkApplyRuleWithClasses(b *testing.B) {
	classes := map[string][]string{
		"K":  {"p", "t", "k"},
		"G":  {"b", "d", "g"},
		"S":  {"s", "z", "ʃ"},
		"N":  {"m", "n", "ŋ"},
		"KW": {"kʷ", "gʷ"},
	}
	e := NewEngineWithClasses(defaultVowels, defaultConsonants, classes)
	r, ok := ParseRule("a → e / K_")
	if !ok {
		b.Fatal("failed to parse benchmark rule")
	}
	const word = "apatakapa"

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = e.ApplyRule(word, r)
	}
}
