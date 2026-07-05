package soundchange

import (
	"reflect"
	"testing"
)

// TestGoldenBackwardCompat proves the new class-aware code path
// (NewEngineWithClasses + Parse) is byte-identical to the pre-existing engine
// (NewEngineOrDefault + ParseRules) for every pipeline/word pair here, none of
// which reference any user class. This is the regression guard required
// before user-defined sound classes can ship: the old call path and the new
// one must never diverge when no classes are involved.
//
// Note: NewEngineOrDefault(nil, nil) defaults empty vowel/consonant
// inventories to the full built-in IPA set, but NewEngine/NewEngineWithClasses
// do not perform that defaulting (that behavior is exclusive to
// NewEngineOrDefault and must stay that way — it is a documented, tested
// difference between the two constructors). So both sides here are built with
// the explicit default inventories to isolate exactly one variable — the
// class-aware code path — rather than accidentally also comparing the
// defaulting behaviors of two different constructors.
func TestGoldenBackwardCompat(t *testing.T) {
	cases := []struct {
		name string
		text string
		word string
	}{
		// From TestBasicContexts.
		{"simple-substitution", "a → e", "banana"},
		{"palatalization-before-i", "k → tʃ / _i", "kaki"},
		{"word-final-raising", "a → e / _#", "saga"},
		{"word-initial-devoicing", "b → p / #_", "baba"},

		// From TestAdjacentEnvironments.
		{"intervocalic-deletion-overlap", "s → ∅ / V_V", "asasa"},
		{"shared-left-context", "a → e / V_", "aaa"},
		{"shared-right-context", "a → e / _a", "aaa"},

		// From TestMultiRunePhonemes.
		{"multi-rune-deaffrication", "tʃ → ʃ / V_V", "atʃa"},

		// Multi-rule pipeline 1 (mirrors TestPipelineAndBatch).
		{"pipeline-palatalize-then-raise", "k → tʃ / _i\na → e / _#", "kaki"},

		// Multi-rule pipeline 2: a longer chain exercising several rule
		// types together (deletion, lenition, final devoicing).
		{
			"pipeline-lenition-chain",
			"s → ∅ / V_V\nt → d / V_V\nb → p / #_",
			"basata",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			oldOut := NewEngineOrDefault(nil, nil).ApplyPipeline(c.word, ParseRules(c.text))
			newOut := NewEngineWithClasses(defaultVowels, defaultConsonants, nil).ApplyPipeline(c.word, Parse(c.text).Rules)

			if oldOut.Changed != newOut.Changed {
				t.Errorf("%s: Changed diverges: old=%q new=%q", c.name, oldOut.Changed, newOut.Changed)
			}
			if !reflect.DeepEqual(oldOut.RulesApplied, newOut.RulesApplied) {
				t.Errorf("%s: RulesApplied diverges: old=%v new=%v", c.name, oldOut.RulesApplied, newOut.RulesApplied)
			}
		})
	}
}
