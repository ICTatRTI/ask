defmodule Ask.SurveyTest do
  use Ask.ModelCase

  alias Ask.Survey

  @valid_attrs %{name: "some content", schedule: Ask.Schedule.default()}
  @invalid_attrs %{}

  test "changeset with valid attributes" do
    changeset = Survey.changeset(%Survey{project_id: 0}, @valid_attrs)
    assert changeset.valid?
  end

  test "changeset with invalid attributes" do
    changeset = Survey.changeset(%Survey{}, @invalid_attrs)
    refute changeset.valid?
  end

  test "default retries configuration" do
    survey = %Survey{}
    assert [] = Survey.retries_configuration(survey, "sms")
  end

  test "parse retries configuration" do
    survey = %Survey{sms_retry_configuration: "5m 2h 3d"}
    assert [5, 120, 4320] = Survey.retries_configuration(survey, "sms")
  end

  test "handle invalid retries configuration" do
    survey = %Survey{sms_retry_configuration: "5m foo . 2 1h"}
    assert [5, 60] = Survey.retries_configuration(survey, "sms")
  end

  test "parse fallback delay" do
    survey = %Survey{fallback_delay: "2h"}
    assert Survey.fallback_delay(survey) == 120
  end

  test "returns nil fallback delay on parse failure" do
    survey = %Survey{fallback_delay: "foo"}
    assert Survey.fallback_delay(survey) == nil
  end
end
