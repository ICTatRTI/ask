defmodule Ask.SessionTest do
  use Ask.ModelCase
  use Ask.DummySteps
  import Ask.Factory
  alias Ask.Runtime.Session
  alias Ask.TestChannel

  test "start" do
    quiz = build(:questionnaire, steps: @dummy_steps)
    respondent = build(:respondent)
    phone_number = respondent.phone_number
    test_channel = TestChannel.new
    channel = build(:channel, settings: test_channel |> TestChannel.settings)

    {session, timeout} = Session.start(quiz, respondent, channel)
    assert %Session{} = session
    assert 10 = timeout

    assert_receive [:setup, ^test_channel, ^respondent]
    assert_receive [:ask, ^test_channel, ^phone_number, ["Do you smoke? Reply 1 for YES, 2 for NO"]]
  end

  test "start with channel without push" do
    quiz = build(:questionnaire, steps: @dummy_steps)
    respondent = build(:respondent)
    test_channel = TestChannel.new(false)
    channel = build(:channel, settings: test_channel |> TestChannel.settings)

    {session, timeout} = Session.start(quiz, respondent, channel)
    assert %Session{} = session
    assert 10 = timeout

    assert_receive [:setup, ^test_channel, ^respondent]
    refute_receive _
  end

  test "last retry" do
    quiz = build(:questionnaire, steps: @dummy_steps)
    respondent = build(:respondent)
    phone_number = respondent.phone_number
    test_channel = TestChannel.new
    channel = build(:channel, settings: test_channel |> TestChannel.settings)

    {session, 10} = Session.start(quiz, respondent, channel)
    assert_receive [:setup, ^test_channel, ^respondent]
    assert_receive [:ask, ^test_channel, ^phone_number, ["Do you smoke? Reply 1 for YES, 2 for NO"]]

    assert :failed = Session.timeout(session)
  end

  test "step" do
    quiz = build(:questionnaire, steps: @dummy_steps)
    respondent = insert(:respondent)
    test_channel = TestChannel.new
    channel = build(:channel, settings: test_channel |> TestChannel.settings)
    {session, _} = Session.start(quiz, respondent, channel)

    step_result = Session.sync_step(session, "N")
    assert {:ok, %Session{}, {:prompt, "Do you exercise? Reply 1 for YES, 2 for NO"}, 10} = step_result

    assert [response] = respondent |> Ecto.assoc(:responses) |> Ask.Repo.all
    assert response.field_name == "Smokes"
    assert response.value == "No"
  end

  test "end" do
    quiz = build(:questionnaire, steps: @dummy_steps)
    respondent = insert(:respondent)
    test_channel = TestChannel.new
    channel = build(:channel, settings: test_channel |> TestChannel.settings)
    {session, _} = Session.start(quiz, respondent, channel)

    {:ok, session, _, _} = Session.sync_step(session, "Y")
    {:ok, session, _, _} = Session.sync_step(session, "N")
    step_result = Session.sync_step(session, "99")
    assert :end == step_result

    responses = respondent
    |> Ecto.assoc(:responses)
    |> Ecto.Query.order_by(:id)
    |> Ask.Repo.all

    assert [
      %{field_name: "Smokes", value: "Yes"},
      %{field_name: "Exercises", value: "No"},
      %{field_name: "Perfect Number", value: "99"}] = responses
  end
end
